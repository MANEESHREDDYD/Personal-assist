-- automation_metrics.sql
SELECT 
    (SELECT COUNT(id) FROM AutomationRule) AS total_rules,
    (SELECT COUNT(id) FROM AutomationRun) AS total_runs,
    (SELECT COUNT(id) FROM AutomationRun WHERE status = 'failed') AS failed_runs,
    (SELECT COUNT(id) FROM Notification) AS total_notifications,
    (SELECT COUNT(id) FROM FollowUp) AS total_follow_ups,
    (SELECT COUNT(id) FROM Reminder) AS total_reminders;
