"# SIH-26" 

cd d:\Projects\SIH-2026\backend\document-service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

cd d:\Projects\SIH-2026\backend\conversation-service
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

cd d:\Projects\SIH-2026\backend\summary-service
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload

cd d:\Projects\SIH-2026\doctor-frontend
npm run dev


cd d:\Projects\SIH-2026\patient-frontend
npm run dev

cd d:\Projects\SIH-2026\patient-mobile
npx expo start
