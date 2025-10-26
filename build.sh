cd ~/Documentos/Langs/JavaScript/py-data-sculptor-78919/

if [ $1 == "run" ]; then
    cd backend/
    python3 app.py
    exit 0
fi

if [[ $1 == "build-run" ]]; then
    npm run build
    rm -rf backend/static/
    mv dist/ backend/static/
    cd backend/
    python3 app.py
    exit 0
fi

npm run build

rm -rf backend/static/
mv dist/ backend/static/
