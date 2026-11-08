-- ============================================================
--  Тестові дані для перевірки структури БД
--  Виконувати ПІСЛЯ schema.sql
-- ============================================================
PRAGMA foreign_keys = ON;

-- Користувачі. Пароль усіх демо-записів — praktyka2026;
-- у базі зберігається лише bcrypt-хеш (алгоритм необоротний, у кожного рядка власна сіль)
INSERT INTO users (id, full_name, email, password_hash, role, phone) VALUES
 (1, 'Пікуляк Микола Васильович',  'mykola.pikuliak@cnu.edu.ua',              '$2a$10$0mX2Wfdx74RAXizZV5KugujUvgwtXMEx8KLMkMxJr.G1ktbG.S5Cq', 'teacher', '+380501112233'),
 (2, 'Ткачук Оксана Іванівна',     'tkachuk@pnu.edu.ua',               '$2a$10$cLkUV741C5O62XVuZC/bvuUm6luSdKFNtu0lTM5eGRpqRaJKGIw8a', 'teacher', '+380502223344'),
 (3, 'Мельник Ірина Петрівна',     'admin@pnu.edu.ua',                 '$2a$10$80NkbhaFRjKKhFR7ZERfO.fjWk4zfxdTpoHrOgZoleFKC/u.N747G',   'admin',   '+380503334455'),
 (4, 'Василюк Софія Ярославівна',  'sofiia.vasyliuk.23@pnu.edu.ua',    '$2a$10$nNOYXB75fxyqSnQaJYbtd.dURcd4Dv1IAhHxXTju672v0ajUOVg0O', 'student', '+380671112233'),
 (5, 'Коваль Андрій Олегович',     'andrii.koval.23@pnu.edu.ua',       '$2a$10$uKkJ7rlrU8XiK.2k7a9ikucN/p33PotgCjDJEzPy.ienKcu.BDc3m', 'student', '+380672223344'),
 (6, 'Шевчук Марія Василівна',     'mariia.shevchuk.23@pnu.edu.ua',    '$2a$10$cth7W.rPSyPDjUEQiJlmQ.XMIzTtPtVqpGOeXi45T.Ba11vQQuaha', 'student', '+380673334455'),
 (7, 'Бойко Дмитро Ігорович',      'dmytro.boiko.23@pnu.edu.ua',       '$2a$10$GzlJFRDh9PJi1ugW/m0gW.viOwgeicAY85D.HmOwZACtkwP8vR006', 'student', '+380674445566'),
 (8, 'Лисенко Катерина Сергіївна', 'kateryna.lysenko.24@pnu.edu.ua',   '$2a$10$4sKZNZtkk2O37LtKETQqkO3dkWe703.svE8M7I/4.niKPOgbdi17y', 'student', '+380675556677');

INSERT INTO students (id, user_id, group_name, record_book_number) VALUES
 (1, 4, 'ІПЗ-41', 'ЗК-22-0101'),
 (2, 5, 'ІПЗ-41', 'ЗК-22-0102'),
 (3, 6, 'ІПЗ-42', 'ЗК-22-0201'),
 (4, 7, 'ІПЗ-42', 'ЗК-22-0202'),
 (5, 8, 'КН-31',  'ЗК-23-0301');

INSERT INTO teachers (id, user_id, department, position) VALUES
 (1, 1, 'Кафедра інформаційних технологій', 'доцент'),
 (2, 2, 'Кафедра інформаційних технологій', 'старший викладач');

INSERT INTO enterprises (id, name, address, phone, email, contract_number, contract_date) VALUES
 (1, 'ТОВ «СофтСерв Україна»',        'м. Івано-Франківськ, вул. Незалежності, 67', '+380342501234', 'hr@softserve.example',  'Д-15/25', '2025-09-01'),
 (2, 'ТОВ «ЕПАМ Системз»',            'м. Львів, вул. Стрийська, 202',              '+380322901234', 'practice@epam.example', 'Д-16/25', '2025-09-03'),
 (3, 'ІТ-компанія «ELEKS»',           'м. Івано-Франківськ, вул. Вовчинецька, 225', '+380342551234', 'edu@eleks.example',     'Д-17/25', '2025-09-05'),
 (4, 'Центр ІТ ПНУ ім. В. Стефаника', 'м. Івано-Франківськ, вул. Шевченка, 57',     '+380342596000', 'it@pnu.edu.ua',         'Д-18/25', '2025-09-10');

INSERT INTO practice_periods (id, type, academic_year, semester, start_date, end_date, hours) VALUES
 (1, 'виробнича',     '2024/2025', 2, '2025-04-07', '2025-05-04', 180),
 (2, 'виробнича',     '2025/2026', 1, '2025-11-03', '2025-11-30', 180),
 (3, 'переддипломна', '2025/2026', 2, '2026-03-02', '2026-03-29', 180);

-- Направлення на практику
INSERT INTO assignments (id, student_id, period_id, enterprise_id, teacher_id, supervisor_name, order_number, order_date, status, report_file_name, report_submitted_at, report_status) VALUES
 (1, 1, 1, 4, 1, 'Ковалик Юрій Петрович',     '№ 312-с', '2025-04-01', 'defended',         'zvit_vasyliuk_2025.pdf', '2025-05-02', 'accepted'),
 (2, 1, 2, 1, 1, 'Гринів Олег Романович',     '№ 815-с', '2025-10-28', 'report_submitted', 'zvit_vasyliuk_2026.pdf', '2025-11-28', 'submitted'),
 (3, 2, 2, 1, 1, 'Гринів Олег Романович',     '№ 815-с', '2025-10-28', 'in_progress',      NULL, NULL, NULL),
 (4, 3, 2, 2, 2, 'Савчук Наталія Богданівна', '№ 815-с', '2025-10-28', 'in_progress',      NULL, NULL, NULL),
 (5, 4, 2, 3, 2, 'Романюк Тарас Іванович',    '№ 815-с', '2025-10-28', 'assigned',         NULL, NULL, NULL),
 (6, 5, 2, 4, 1, 'Ковалик Юрій Петрович',     '№ 816-с', '2025-10-29', 'defended',         'zvit_lysenko_2026.pdf',  '2025-11-27', 'accepted');

-- Записи щоденника
INSERT INTO diary_entries (assignment_id, entry_date, description, hours, status, teacher_comment) VALUES
 (2, '2025-11-03', 'Інструктаж з техніки безпеки. Знайомство з командою та проєктом.', 6, 'approved', NULL),
 (2, '2025-11-04', 'Налаштування робочого середовища: Git, Node.js, VS Code.', 6, 'approved', NULL),
 (2, '2025-11-05', 'Вивчення архітектури проєкту, читання документації API.', 6, 'approved', 'Добре'),
 (2, '2025-11-06', 'Реалізація компонента форми реєстрації (React).', 6, 'approved', NULL),
 (2, '2025-11-07', 'Написання тестів для компонента форми.', 6, 'submitted', NULL),
 (3, '2025-11-03', 'Інструктаж, ознайомлення з правилами внутрішнього розпорядку.', 6, 'approved', NULL),
 (3, '2025-11-04', 'Аналіз вимог до модуля звітності.', 6, 'submitted', NULL),
 (3, '2025-11-05', 'Проєктування схеми бази даних модуля.', 5, 'rejected', 'Замало деталей, опишіть, які саме таблиці спроєктовано'),
 (4, '2025-11-03', 'Знайомство з проєктом, налаштування середовища.', 6, 'approved', NULL),
 (4, '2025-11-04', 'Вивчення технічного завдання.', 6, 'approved', NULL),
 (6, '2025-11-03', 'Ознайомлення з інфраструктурою центру ІТ.', 6, 'approved', NULL),
 (6, '2025-11-04', 'Адміністрування навчального сервера Moodle.', 6, 'approved', NULL),
 (1, '2025-04-07', 'Ознайомлення з роботою центру ІТ університету.', 6, 'approved', NULL);

-- Оцінки
INSERT INTO grades (assignment_id, enterprise_grade, teacher_grade, final_score, ects_grade, national_grade, defense_date, comment) VALUES
 (1, 92, 90, 91, 'A', 'відмінно', '2025-05-06', 'Захист пройшов успішно'),
 (6, 85, 80, 82, 'B', 'добре',    '2025-12-02', NULL);
