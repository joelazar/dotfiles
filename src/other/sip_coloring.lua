--[[
-- This is a simple example how to use
-- colorize filter in Wireshark Lua.
--
-- It handles SIP messages and colors them.
-- REGISTER and SUBSCRIBE messages are
-- excluded.
--
-- I have added detailed comments so it is
-- really easy to understand.
-- 
-- It's free to customize it for your taste.
-- Peter Somogyi
--]]

do
    -- Define SIP methods not intented to colorize
    local function skipSipMethods(SipMethod)
        --specify unwanted methods here
	local noColorize = { "REGISTER", "SUBSCRIBE", "OPTIONS"}
	local result = false;
	-- key: index 
	-- value: methodname
	for key,value in next,noColorize,nil do
	   if (value == SipMethod) then
	       result = true;
	   end
	end
	return result;
    end
 
    --Tables for colorize
    frames    = {};
    skipTable = {};
    local counter   = 0;
    -- set it false if you don't need log window
    local isLog = false;

    -- Fields to handle colorize
    -- colorize will based on SIP Call-ID
    -- SIP Method used to filter out messages from colorize
    local sip_callid_f = Field.new("sip.Call-ID");
    local sip_method_f = Field.new("sip.Method");

    -- Handle closed window
    local function log_closed()
       isLog = false;
    end

    -- Create an optional log window
    if isLog then
        win = TextWindow.new("Log");
        win:set_atclose(log_closed);
    end


    --listen sip messages
    local function init_sip_colorizer()
	-- what kind of packets we are looking for
	-- 1st param: tap name - any string
	-- 2nd param: filter
        local tap = Listener.new("frame","sip");

	-- call before handling a capture file
	function tap.reset()
		-- reset variables
		counter = 5;
		frames = {};
		skipTable = {};
        end

      	-- called for every packet matched the filter 
        function tap.packet(pinfo,tvb,ip)
	   -- get fields from packet
           local sip_callid = sip_callid_f();
	   local sip_method = sip_method_f();
           local frame = tostring(pinfo.number);
	   local callid = tostring(sip_callid);
	   local method = tostring(sip_method);

	   -- skip unwanted sip methods
	   if skipSipMethods(method) then
	      skipTable[callid] = -1;  --does not really matter its content while its not nil
	      if isLog then
	         win:append("Skip Frame: "..frame.." , method: "..method.."\n");
	      end
           -- have a call-id and it have not processed yet
	   elseif callid and frames[callid] == nil and skipTable[callid] == nil then
              counter = counter + 1 ;
	      -- we know that only 10 color slot available
              if counter > 10 then counter = 1 end;
	      -- set temporary filter in wireshark
	      -- 1st parameter - use that color slot
	      -- 2nd parameter - assign that filter to it
              set_color_filter_slot(counter,"sip.Call-ID == \""..callid.."\"");
              frames[callid] = counter;
              -- if isLog then
		 -- win:append(" Frame: "..frame.." , sip-callid "..callid.."\n");
              -- end
           end
        end
       
	--called after packets have displayed on screen
	function tap.draw()
	    if isLog then
	       win:append(" ----------- End of File ----------\n");
	    end
        end

    end

    -- colorize sip packets by call-id
    init_sip_colorizer();
end

