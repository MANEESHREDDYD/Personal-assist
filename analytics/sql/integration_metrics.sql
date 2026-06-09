-- integration_metrics.sql
SELECT 
    (SELECT COUNT(id) FROM Connector) AS total_connectors,
    (SELECT COUNT(id) FROM ConnectorAccount) AS total_connector_accounts,
    (SELECT COUNT(id) FROM ConnectorAccount WHERE status = 'connected') AS active_connections,
    (SELECT COUNT(id) FROM ConnectorAccount WHERE status IN ('error', 'revoked')) AS failed_connections;
