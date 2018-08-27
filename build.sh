NAME="drive-upload"

/usr/bin/git fetch
/usr/bin/git rebase
/usr/bin/npm install
/usr/bin/npm run build
/usr/bin/pm2 delete "$NAME"
/usr/bin/pm2 start --name "$NAME" build/main.js
