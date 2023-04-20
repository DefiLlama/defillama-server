-- users
CREATE TABLE hourlyUsers (start INT, endTime INT, protocolId VARCHAR(200), chain VARCHAR(200), users INT, PRIMARY KEY(start, protocolId, chain));
CREATE INDEX idx_time ON hourlyUsers (start);
CREATE TABLE dailyUsers (start INT, endTime INT, protocolId VARCHAR(200), chain VARCHAR(200), users INT, realStart INT, PRIMARY KEY(start, protocolId, chain));
CREATE INDEX idx_time2 ON dailyUsers (start);

-- txs
CREATE TABLE hourlyTxs (start INT, endTime INT, protocolId VARCHAR(200), chain VARCHAR(200), txs INT, PRIMARY KEY(start, protocolId, chain));
CREATE INDEX hourlyTxs_time ON hourlyTxs (start);
CREATE TABLE dailyTxs (start INT, endTime INT, protocolId VARCHAR(200), chain VARCHAR(200), txs INT, realStart INT, PRIMARY KEY(start, protocolId, chain));
CREATE INDEX dailyTxs_time2 ON dailyTxs (start);

-- gas
CREATE TABLE hourlyGas (start INT, endTime INT, protocolId VARCHAR(200), chain VARCHAR(200), gas double precision, gasUsd double precision, PRIMARY KEY(start, protocolId, chain));
CREATE INDEX hourlyGas_time ON hourlyGas (start);
CREATE TABLE dailyGas (start INT, endTime INT, protocolId VARCHAR(200), chain VARCHAR(200), gas double precision, gasUsd double precision, realStart INT, PRIMARY KEY(start, protocolId, chain));
CREATE INDEX dailyGas_time2 ON dailyGas (start);