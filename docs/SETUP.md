# ERP 시스템 설치 & 실행 가이드

## 1단계 — 필수 프로그램 설치

### Node.js 설치
1. https://nodejs.org 접속
2. **LTS 버전** 다운로드 & 설치
3. 설치 확인:
   ```bash
   node -v   # v20.x.x 출력되면 성공
   npm -v    # v10.x.x 출력되면 성공
   ```

### PostgreSQL 설치
1. https://www.postgresql.org/download 접속
2. 운영체제에 맞게 다운로드 & 설치
3. 설치 시 비밀번호 꼭 기억 (예: `postgres`)
4. 설치 확인:
   ```bash
   psql --version   # PostgreSQL 16.x 출력되면 성공
   ```

### Git 설치 (선택)
1. https://git-scm.com 접속하여 설치

---

## 2단계 — 프로젝트 설정

### 프로젝트 폴더로 이동
```bash
cd erp-system
```

### 백엔드 패키지 설치
```bash
cd backend
npm install
```

### 프론트엔드 패키지 설치
```bash
cd ../frontend
npm install
```

---

## 3단계 — 데이터베이스 설정

### DB 생성 (PostgreSQL)
```bash
psql -U postgres
CREATE DATABASE erp_db;
\q
```

### 환경변수 파일 설정
`backend/.env` 파일을 열고 아래 내용 입력:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/erp_db"
JWT_SECRET="erp-super-secret-key-change-in-production"
PORT=4000
```
`YOUR_PASSWORD` 부분을 PostgreSQL 설치 시 설정한 비밀번호로 바꾸세요.

### 테이블 생성 (Prisma 마이그레이션)
```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

---

## 4단계 — 실행

### 백엔드 실행 (터미널 1)
```bash
cd backend
npm run dev
# → http://localhost:4000 에서 실행
```

### 프론트엔드 실행 (터미널 2)
```bash
cd frontend
npm run dev
# → http://localhost:3000 에서 실행
```

### 브라우저에서 접속
http://localhost:3000

**기본 로그인 계정:**
- 이메일: `admin@erp.com`
- 비밀번호: `admin1234`

---

## 문제 해결

| 오류 | 해결 방법 |
|------|-----------|
| `Cannot find module` | `npm install` 재실행 |
| `Connection refused` | PostgreSQL 실행 중인지 확인 |
| `Invalid token` | `.env` JWT_SECRET 확인 |
| 포트 충돌 | `.env`에서 PORT 변경 |
