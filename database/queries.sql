-- ============================================================
--  Тестові запити для перевірки коректності структури БД
--  Запуск (на копії бази):  cp practice.db test.db && sqlite3 test.db < queries.sql
-- ============================================================
PRAGMA foreign_keys = ON;
.headers on
.mode column
.width 0

.print ''
.print '=== Запит 1. Список усіх направлень: студент, група, база практики, керівник, статус ==='
SELECT a.id, us.full_name AS student, s.group_name AS grp, e.name AS enterprise,
       ut.full_name AS teacher, a.status
FROM assignments a
JOIN students s    ON s.id = a.student_id
JOIN users us      ON us.id = s.user_id
JOIN enterprises e ON e.id = a.enterprise_id
JOIN teachers t    ON t.id = a.teacher_id
JOIN users ut      ON ut.id = t.user_id
ORDER BY a.id;

.print ''
.print '=== Запит 2. Щоденник практики студентки Василюк С. Я. за 2025/2026 навчальний рік ==='
SELECT d.entry_date, d.hours, d.status, substr(d.description, 1, 55) AS description
FROM diary_entries d
JOIN assignments a      ON a.id = d.assignment_id
JOIN students s         ON s.id = a.student_id
JOIN users u            ON u.id = s.user_id
JOIN practice_periods p ON p.id = a.period_id
WHERE u.full_name LIKE 'Василюк%' AND p.academic_year = '2025/2026'
ORDER BY d.entry_date;

.print ''
.print '=== Запит 3. Кількість годин та записів у щоденнику кожного студента (період 2) ==='
SELECT us.full_name AS student, COUNT(d.id) AS entries, COALESCE(SUM(d.hours), 0) AS total_hours,
       SUM(CASE WHEN d.status = 'approved' THEN 1 ELSE 0 END) AS approved
FROM assignments a
JOIN students s ON s.id = a.student_id
JOIN users us   ON us.id = s.user_id
LEFT JOIN diary_entries d ON d.assignment_id = a.id
WHERE a.period_id = 2
GROUP BY us.full_name
ORDER BY total_hours DESC;

.print ''
.print '=== Запит 4. Статистика: кількість направлень за статусами ==='
SELECT status, COUNT(*) AS cnt FROM assignments GROUP BY status ORDER BY cnt DESC;

.print ''
.print '=== Запит 5. Навантаження керівників: скільки студентів у кожного викладача (період 2) ==='
SELECT ut.full_name AS teacher, t.position, COUNT(a.id) AS students_count
FROM teachers t
JOIN users ut ON ut.id = t.user_id
LEFT JOIN assignments a ON a.teacher_id = t.id AND a.period_id = 2
GROUP BY t.id;

.print ''
.print '=== Запит 6. Студенти, які подали звіт, але ще не мають оцінки (очікують захисту) ==='
SELECT us.full_name AS student, a.report_file_name, a.report_submitted_at, a.report_status
FROM assignments a
JOIN students s ON s.id = a.student_id
JOIN users us   ON us.id = s.user_id
LEFT JOIN grades g ON g.assignment_id = a.id
WHERE a.report_file_name IS NOT NULL AND g.id IS NULL;

.print ''
.print '=== Запит 7. Відомість результатів захисту ==='
SELECT us.full_name AS student, s.group_name AS grp, e.name AS enterprise,
       g.enterprise_grade, g.teacher_grade, g.final_score, g.ects_grade, g.national_grade, g.defense_date
FROM grades g
JOIN assignments a ON a.id = g.assignment_id
JOIN students s    ON s.id = a.student_id
JOIN users us      ON us.id = s.user_id
JOIN enterprises e ON e.id = a.enterprise_id
ORDER BY g.defense_date;

.print ''
.print '=== Запит 8. Перевірка обмеження UNIQUE: друге направлення того ж студента на той самий період (очікується помилка) ==='
INSERT INTO assignments (student_id, period_id, enterprise_id, teacher_id) VALUES (1, 2, 2, 1);

.print ''
.print '=== Запит 9. Перевірка зовнішнього ключа: запис щоденника до неіснуючого направлення (очікується помилка) ==='
INSERT INTO diary_entries (assignment_id, entry_date, description, hours) VALUES (999, '2025-11-10', 'Тест', 6);

.print ''
.print '=== Запит 10. Оновлення: студент Коваль подав звіт ==='
UPDATE assignments
SET status = 'report_submitted', report_file_name = 'zvit_koval.pdf',
    report_submitted_at = '2025-11-29', report_status = 'submitted'
WHERE id = 3;
SELECT a.id, us.full_name, a.status, a.report_file_name
FROM assignments a JOIN students s ON s.id = a.student_id JOIN users us ON us.id = s.user_id
WHERE a.id = 3;

.print ''
.print '=== Запит 11. Каскадне видалення: видаляємо направлення 4 (Шевчук) — його записи щоденника теж зникають ==='
SELECT COUNT(*) AS diary_before FROM diary_entries WHERE assignment_id = 4;
DELETE FROM assignments WHERE id = 4;
SELECT COUNT(*) AS diary_after FROM diary_entries WHERE assignment_id = 4;
