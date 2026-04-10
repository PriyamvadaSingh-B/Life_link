@echo off
echo.
echo  =========================================
echo    LifeLink Blood Bank System
echo  =========================================
echo.
echo  Installing dependencies...
cd backend
call npm install
echo.
echo  Starting server...
echo  Open your browser at: http://localhost:3000
echo.
node server.js
pause
