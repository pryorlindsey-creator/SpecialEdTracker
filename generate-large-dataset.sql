-- SQL script to generate large test dataset
-- 10 users, 20 students each, 5-7 goals per student, 10-15 data points per goal

-- First, create test users
INSERT INTO users (id, email, "firstName", "lastName", "profileImageUrl", "createdAt", "updatedAt") VALUES
('test_user_001', 'teacher1@testschool.edu', 'Sarah', 'Johnson', null, NOW(), NOW()),
('test_user_002', 'teacher2@testschool.edu', 'Michael', 'Williams', null, NOW(), NOW()),
('test_user_003', 'teacher3@testschool.edu', 'Jennifer', 'Brown', null, NOW(), NOW()),
('test_user_004', 'teacher4@testschool.edu', 'David', 'Jones', null, NOW(), NOW()),
('test_user_005', 'teacher5@testschool.edu', 'Lisa', 'Garcia', null, NOW(), NOW()),
('test_user_006', 'teacher6@testschool.edu', 'Robert', 'Miller', null, NOW(), NOW()),
('test_user_007', 'teacher7@testschool.edu', 'Amanda', 'Davis', null, NOW(), NOW()),
('test_user_008', 'teacher8@testschool.edu', 'Christopher', 'Rodriguez', null, NOW(), NOW()),
('test_user_009', 'teacher9@testschool.edu', 'Michelle', 'Martinez', null, NOW(), NOW()),
('test_user_010', 'teacher10@testschool.edu', 'James', 'Hernandez', null, NOW(), NOW());

-- Generate students for each user (200 total)
DO $$
DECLARE
    user_id TEXT;
    user_counter INTEGER := 1;
    student_counter INTEGER;
    student_id INTEGER;
    goal_counter INTEGER;
    goal_id INTEGER;
    dp_counter INTEGER;
    random_date DATE;
    grades TEXT[] := ARRAY['PreK', 'K', '1', '2', '3', '4', '5', '6', '7', '8'];
    first_names TEXT[] := ARRAY['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia', 'Mason', 'Isabella', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Mia', 'Henry', 'Harper', 'Alexander', 'Evelyn', 'Sebastian'];
    last_names TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
    services TEXT[] := ARRAY['Speech-Language Therapy', 'Occupational Therapy', 'Physical Therapy', 'Vision', 'Hearing', 'Nursing'];
    goal_titles TEXT[] := ARRAY['Reading Comprehension', 'Math Problem Solving', 'Social Interaction', 'Task Completion', 'Following Directions', 'Behavioral Regulation', 'Communication Skills', 'Attention to Task', 'Writing Skills', 'Self-Advocacy'];
    goal_types TEXT[] := ARRAY['percentage', 'frequency', 'duration'];
    support_levels TEXT[] := ARRAY['Independent', 'Verbal Prompt', 'Visual Prompt', 'Gestural Prompt', 'Physical Prompt', 'Hand-over-Hand'];
BEGIN
    -- Loop through each test user
    FOR user_counter IN 1..10 LOOP
        user_id := 'test_user_' || LPAD(user_counter::TEXT, 3, '0');
        
        -- Create 20 students for each user
        FOR student_counter IN 1..20 LOOP
            INSERT INTO students ("userId", name, grade, "iepDueDate", "relatedServices", "createdAt", "updatedAt")
            VALUES (
                user_id,
                first_names[1 + (RANDOM() * (array_length(first_names, 1) - 1))::INTEGER] || ' ' || 
                last_names[1 + (RANDOM() * (array_length(last_names, 1) - 1))::INTEGER] || ' ' ||
                user_counter || '-' || student_counter,
                grades[1 + (RANDOM() * (array_length(grades, 1) - 1))::INTEGER],
                CURRENT_DATE + INTERVAL '30 days' + (RANDOM() * 300)::INTEGER * INTERVAL '1 day',
                services[1 + (RANDOM() * (array_length(services, 1) - 1))::INTEGER],
                NOW(),
                NOW()
            )
            RETURNING id INTO student_id;
            
            -- Create 5-7 goals for each student
            FOR goal_counter IN 1..(5 + (RANDOM() * 2)::INTEGER) LOOP
                INSERT INTO goals ("studentId", title, description, "targetCriteria", "dataCollectionType", status, "levelOfSupport", "createdAt", "updatedAt")
                VALUES (
                    student_id,
                    goal_titles[1 + (RANDOM() * (array_length(goal_titles, 1) - 1))::INTEGER] || ' - Goal ' || goal_counter,
                    'Student will demonstrate improved performance in this skill area with appropriate supports.',
                    '80% accuracy over 3 consecutive sessions',
                    goal_types[1 + (RANDOM() * (array_length(goal_types, 1) - 1))::INTEGER],
                    CASE WHEN RANDOM() > 0.5 THEN 'Active' ELSE 'In Progress' END,
                    '["' || support_levels[1 + (RANDOM() * (array_length(support_levels, 1) - 1))::INTEGER] || '"]',
                    NOW(),
                    NOW()
                )
                RETURNING id INTO goal_id;
                
                -- Create 10-15 data points for each goal
                FOR dp_counter IN 1..(10 + (RANDOM() * 5)::INTEGER) LOOP
                    random_date := CURRENT_DATE - (RANDOM() * 60)::INTEGER;
                    
                    -- Get the goal type to determine data point structure
                    DECLARE
                        goal_type TEXT;
                    BEGIN
                        SELECT "dataCollectionType" INTO goal_type FROM goals WHERE id = goal_id;
                        
                        IF goal_type = 'percentage' THEN
                            INSERT INTO data_points ("goalId", "studentId", date, "correctTrials", "totalTrials", "levelOfSupport", notes, "createdAt", "updatedAt")
                            VALUES (
                                goal_id,
                                student_id,
                                random_date,
                                6 + (RANDOM() * 4)::INTEGER,
                                10,
                                '["' || support_levels[1 + (RANDOM() * (array_length(support_levels, 1) - 1))::INTEGER] || '"]',
                                'Data point ' || dp_counter || ' for student progress tracking',
                                NOW(),
                                NOW()
                            );
                        ELSIF goal_type = 'frequency' THEN
                            INSERT INTO data_points ("goalId", "studentId", date, frequency, "levelOfSupport", notes, "createdAt", "updatedAt")
                            VALUES (
                                goal_id,
                                student_id,
                                random_date,
                                1 + (RANDOM() * 7)::INTEGER,
                                '["' || support_levels[1 + (RANDOM() * (array_length(support_levels, 1) - 1))::INTEGER] || '"]',
                                'Data point ' || dp_counter || ' for frequency tracking',
                                NOW(),
                                NOW()
                            );
                        ELSE -- duration
                            INSERT INTO data_points ("goalId", "studentId", date, "durationValue", "durationUnit", "levelOfSupport", notes, "createdAt", "updatedAt")
                            VALUES (
                                goal_id,
                                student_id,
                                random_date,
                                1.0 + (RANDOM() * 9.0),
                                CASE WHEN RANDOM() > 0.5 THEN 'minutes' ELSE 'seconds' END,
                                '["' || support_levels[1 + (RANDOM() * (array_length(support_levels, 1) - 1))::INTEGER] || '"]',
                                'Data point ' || dp_counter || ' for duration tracking',
                                NOW(),
                                NOW()
                            );
                        END IF;
                    END;
                END LOOP;
            END LOOP;
        END LOOP;
        
        RAISE NOTICE 'Completed User %: % students created', user_counter, student_counter;
    END LOOP;
    
    RAISE NOTICE 'Test data generation complete!';
END $$;