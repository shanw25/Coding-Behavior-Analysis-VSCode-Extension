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
          First Name: <input id="firstName" type="text" name="fname" value=""><br>
          Last Name: <input id="lastName" type="text" name="fname" value=""><br>
          PID: <input id="pid" type="text" name="fname" value=""><br>
          </form> 
          <button onclick="setInfo()">Submit</button>
          
        <script>
            window.addEventListener(\'message\', event => {
                const name = event.data; // The JSON data our extension sent
                document.getElementById("firstName").value = name["firstName"];
                document.getElementById("lastName").value = name["lastName"];
                document.getElementById("pid").value = name["pid"];
            });
            function setInfo() {
              const vscode = acquireVsCodeApi();
              var x = document.getElementById("info");
              vscode.postMessage({
                  firstName: x[0].value,
                  lastName: x[1].value,
                  pid: x[2].value,
              });
            }
        </script>
      </body>
      </html>`;
  }