export function getWebContent(): string {
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cat Coding</title>
      </head>
      <body>
          <form id="info">
          Username: <input id="username" type="text" name="fname" value=""><br>
          </form> 
          <button onclick="setInfo()">Submit</button>
          
        <script>
            window.addEventListener(\'message\', event => {
                const name = event.data; // The JSON data our extension sent
                document.getElementById("username").value = name["username"];
            });
            function setInfo() {
              const vscode = acquireVsCodeApi();
              var x = document.getElementById("info");
              vscode.postMessage({
                  username: x[0].value,
              });
            }
        </script>
      </body>
      </html>`;
  }