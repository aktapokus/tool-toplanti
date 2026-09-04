@echo off
setlocal enabledelayedexpansion

REM Betigin calisma dizinini KENDI konumuna sabitle - "Yonetici olarak
REM calistir" bazi Windows kurulumlarinda calisma dizinini System32ye
REM sabitleyip goreli yol/robocopy komutlarini sessizce bozabiliyor.
cd /d "%~dp0"

echo ============================================
echo   TOPLANTI NOTLARI - TOOL KURULUM
echo ============================================
echo.

set DEFAULT_CORE=..\aktapokus-core
set /p CORE_PATH=Core klasoru nerede? [%DEFAULT_CORE%]:
if "%CORE_PATH%"=="" set CORE_PATH=%DEFAULT_CORE%

if not exist "%CORE_PATH%\core\docker-compose.yml" goto BADCORE
if not exist "%CORE_PATH%\.env" goto NOENV

echo.
echo Konusmaci ayrimi icin bir HuggingFace erisim token'i gerekiyor.
echo (Bos birakip sonra arayuzdeki "Baglanti Ayarlari"ndan da girebilirsiniz.)
echo Detayli adimlar icin README.md'ye bakin.
echo.
findstr /b "HF_TOKEN=" "%CORE_PATH%\.env" >nul 2>&1
if not errorlevel 1 goto SKIPCREDS

set /p HF_TOKEN_DEGER=HuggingFace Token (bos gecebilirsiniz):
if "%HF_TOKEN_DEGER%"=="" goto DOCOPY

echo HF_TOKEN=%HF_TOKEN_DEGER%>> "%CORE_PATH%\.env"
echo       .env'e yazildi.
goto DOCOPY

:SKIPCREDS
echo       HF_TOKEN zaten .env'de mevcut, atlaniyor.

:DOCOPY
echo [1/3] Dosyalar kopyalaniyor: %CORE_PATH%\tools\toplanti\
if not exist "%CORE_PATH%\tools\toplanti" mkdir "%CORE_PATH%\tools\toplanti"
robocopy . "%CORE_PATH%\tools\toplanti" /E /XF setup.bat uninstall.bat /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto COPYFAIL

echo [2/3] Container yeniden build ediliyor - yeni bagimlilik var (torch/whisper/pyannote, biraz surebilir)...
pushd "%CORE_PATH%\core"
docker compose up -d --build
if errorlevel 1 goto BUILDFAIL

echo [3/3] Model agirliklari onceden indiriliyor - ilk toplantinizda beklememeniz icin (birkac dakika surebilir, internet gerektirir)...
docker compose exec -T app python -c "from tools.toplanti import modelleri_onceden_indir; modelleri_onceden_indir()"
if errorlevel 1 echo       UYARI: On-indirme tamamlanamadi - sorun degil, ilk gercek kullanimda otomatik tekrar denenecek.
popd

echo.
echo ============================================
echo   TOPLANTI NOTLARI KURULDU
echo ============================================
echo   Arayuzu yenileyin: http://localhost:8000
echo   Tool listesinde "Toplanti Notlari" gorunmeli.
echo   HF_TOKEN girmediyseniz, arayuzdeki "Baglanti Ayarlari"ndan
echo   sonradan girebilirsiniz - konusmaci ayrimi modeli o zaman inecek.
echo ============================================
pause
exit /b 0

:BADCORE
echo [HATA] Belirtilen yolda aktapokus-core bulunamadi: %CORE_PATH%
echo        core\docker-compose.yml orada olmali.
pause
exit /b 1

:NOENV
echo [HATA] %CORE_PATH%\.env bulunamadi.
echo        Once core klasorunde setup.bat'i calistirip core kurulumunu
echo        tamamlayin, sonra bu betigi tekrar calistirin.
pause
exit /b 1

:COPYFAIL
echo [HATA] Dosyalar kopyalanamadi.
pause
exit /b 1

:BUILDFAIL
echo [HATA] Docker build basarisiz oldu. Yukaridaki hatayi kontrol edin.
popd
pause
exit /b 1
