SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;

SELECT a.id,u.full_name,c.number,d.faculty FROM assignments a JOIN students s ON s.id=a.student_id JOIN users u ON u.id=s.user_id LEFT JOIN practice_contracts c ON c.assignment_id=a.id LEFT JOIN diary_documents d ON d.assignment_id=a.id WHERE a.id=2;

SELECT title,start_date,end_date,completed FROM diary_schedule WHERE assignment_id=2;

PRAGMA foreign_key_check;
