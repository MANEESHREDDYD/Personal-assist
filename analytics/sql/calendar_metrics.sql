-- calendar_metrics.sql
SELECT 
    COUNT(id) AS total_events,
    SUM(CASE WHEN source = 'google_calendar' THEN 1 ELSE 0 END) AS total_google,
    SUM(CASE WHEN source = 'outlook_calendar' THEN 1 ELSE 0 END) AS total_outlook,
    SUM(CASE WHEN source = 'imported_ics' THEN 1 ELSE 0 END) AS total_ics
FROM CalendarEvent;
