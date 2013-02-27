local keyName   = KEYS[1]
local value     = ARGV[1]

redis.call('set', keyName, value);
return redis.call('get', keyName);