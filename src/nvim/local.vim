" My custom commands
command Build cexpr system('vital ' . shellescape(expand('%:r')))
command BuildLast cexpr system('vital -last ' . shellescape(expand('%:r')))

