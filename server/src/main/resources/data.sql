-- 카카오 로그인: 최소 정보로 회원 생성 지원 (nullable 컬럼 변경)
ALTER TABLE users MODIFY COLUMN birth_date date NULL;
ALTER TABLE users MODIFY COLUMN gender varchar(1) NULL;
ALTER TABLE users MODIFY COLUMN calendar_type varchar(10) NULL;
ALTER TABLE users MODIFY COLUMN zodiac_animal varchar(255) NULL;
