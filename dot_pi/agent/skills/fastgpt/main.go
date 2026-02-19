package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

const fastGPTURL = "https://kagi.com/api/v0/fastgpt"

type fastGPTRequest struct {
	Query    string `json:"query"`
	Cache    bool   `json:"cache"`
	WebSearch bool  `json:"web_search"`
}

type apiMeta struct {
	ID   string   `json:"id,omitempty"`
	Node string   `json:"node,omitempty"`
	MS   int      `json:"ms,omitempty"`
	APIBalance *float64 `json:"api_balance,omitempty"`
}

type reference struct {
	Title   string `json:"title"`
	Snippet string `json:"snippet"`
	URL     string `json:"url"`
}

type fastGPTData struct {
	Output     string      `json:"output"`
	Tokens     int         `json:"tokens"`
	References []reference `json:"references"`
}

type fastGPTResponse struct {
	Meta apiMeta     `json:"meta"`
	Data fastGPTData `json:"data"`
}

type outputJSON struct {
	Query      string      `json:"query"`
	Output     string      `json:"output"`
	Tokens     int         `json:"tokens"`
	References []reference `json:"references,omitempty"`
	Meta       apiMeta     `json:"meta,omitempty"`
}

func main() {
	args := os.Args[1:]
	if len(args) == 0 {
		printUsage()
		os.Exit(1)
	}

	if err := run(args); err != nil {
		fmt.Fprintln(os.Stderr, "Error:", err)
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("Usage: fastgpt <query> [options]")
	fmt.Println()
	fmt.Println("Options:")
	fmt.Println("  --json              Emit JSON output")
	fmt.Println("  --no-refs           Suppress references/sources in text output")
	fmt.Println("  --no-cache          Bypass cached responses")
	fmt.Println("  --timeout <sec>     HTTP timeout in seconds (default: 30)")
	fmt.Println()
	fmt.Println("Environment:")
	fmt.Println("  KAGI_API_KEY        Required. Your Kagi API key.")
	fmt.Println()
	fmt.Println("Examples:")
	fmt.Println("  fastgpt \"What is the capital of France?\"")
	fmt.Println("  fastgpt \"How does Go garbage collection work?\" --json")
	fmt.Println("  fastgpt \"Latest Go release\" --no-cache")
}

func run(args []string) error {
	jsonOut := false
	noRefs := false
	noCache := false
	timeoutSec := 30

	queryParts := make([]string, 0, len(args))
	for i := 0; i < len(args); i++ {
		arg := args[i]
		switch arg {
		case "-h", "--help":
			printUsage()
			return nil
		case "--":
			queryParts = append(queryParts, args[i+1:]...)
			i = len(args)
		case "--json":
			jsonOut = true
		case "--no-refs":
			noRefs = true
		case "--no-cache":
			noCache = true
		case "--timeout":
			if i+1 >= len(args) {
				return errors.New("missing value for --timeout")
			}
			i++
			var n int
			if _, err := fmt.Sscanf(args[i], "%d", &n); err != nil {
				return fmt.Errorf("invalid value for --timeout: %s", args[i])
			}
			timeoutSec = n
		default:
			if strings.HasPrefix(arg, "-") {
				return fmt.Errorf("unknown option: %s", arg)
			}
			queryParts = append(queryParts, arg)
		}
	}

	query := strings.TrimSpace(strings.Join(queryParts, " "))
	if query == "" {
		printUsage()
		return errors.New("query is required")
	}

	apiKey := strings.TrimSpace(os.Getenv("KAGI_API_KEY"))
	if apiKey == "" {
		return errors.New("KAGI_API_KEY environment variable is required (https://kagi.com/settings/api)")
	}

	if timeoutSec < 1 {
		timeoutSec = 1
	}

	client := &http.Client{Timeout: time.Duration(timeoutSec) * time.Second}

	resp, err := callFastGPT(client, apiKey, query, !noCache)
	if err != nil {
		return err
	}

	if jsonOut {
		out := outputJSON{
			Query:      query,
			Output:     resp.Data.Output,
			Tokens:     resp.Data.Tokens,
			References: resp.Data.References,
			Meta:       resp.Meta,
		}
		if noRefs {
			out.References = nil
		}
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(out)
	}

	// Text output
	fmt.Println(resp.Data.Output)

	if !noRefs && len(resp.Data.References) > 0 {
		fmt.Println()
		fmt.Println("--- References ---")
		for i, ref := range resp.Data.References {
			fmt.Printf("[%d] %s\n", i+1, ref.Title)
			fmt.Printf("    %s\n", ref.URL)
			if ref.Snippet != "" {
				fmt.Printf("    %s\n", ref.Snippet)
			}
		}
	}

	if resp.Meta.APIBalance != nil {
		fmt.Fprintf(os.Stderr, "[API Balance: $%.2f | tokens: %d]\n", *resp.Meta.APIBalance, resp.Data.Tokens)
	} else {
		fmt.Fprintf(os.Stderr, "[tokens: %d]\n", resp.Data.Tokens)
	}

	return nil
}

func callFastGPT(client *http.Client, apiKey, query string, cache bool) (*fastGPTResponse, error) {
	reqBody := fastGPTRequest{
		Query:    query,
		Cache:    cache,
		WebSearch: true, // web_search must be true per API docs
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(http.MethodPost, fastGPTURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bot "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		// Try to extract error message from response
		var errResp struct {
			Error []struct {
				Code int    `json:"code"`
				Msg  string `json:"msg"`
			} `json:"error"`
		}
		if json.Unmarshal(respBody, &errResp) == nil && len(errResp.Error) > 0 {
			return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, errResp.Error[0].Msg)
		}
		text := strings.TrimSpace(string(respBody))
		if len(text) > 500 {
			text = text[:500] + "..."
		}
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, text)
	}

	var out fastGPTResponse
	if err := json.Unmarshal(respBody, &out); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if out.Data.Output == "" {
		return nil, errors.New("empty response from FastGPT API")
	}

	return &out, nil
}
