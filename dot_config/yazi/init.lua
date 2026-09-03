require("git"):setup()

-- Linemode "size": show file sizes only, no item count for directories
function Linemode:size()
	local size = self._file:size()
	return size and ya.readable_size(size) or ""
end

-- Status bar: modified time + owner of the hovered file (right side, before perms)
Status:children_add(function(self)
	local h = self._current.hovered
	if not h then
		return ""
	end
	local time = math.floor(h.cha.mtime or 0)
	if time == 0 then
		return ""
	end
	local fmt = os.date("%Y", time) == os.date("%Y") and "%b %d %H:%M" or "%Y-%m-%d"
	return ui.Line { ui.Span(os.date(fmt, time) .. " "):fg("blue") }
end, 500, Status.RIGHT)

Status:children_add(function(self)
	local h = self._current.hovered
	if not h then
		return ""
	end
	local user = ya.user_name(h.cha.uid) or tostring(h.cha.uid)
	local group = ya.group_name(h.cha.gid) or tostring(h.cha.gid)
	return ui.Line { ui.Span(user .. ":" .. group .. " "):fg("magenta") }
end, 600, Status.RIGHT)
