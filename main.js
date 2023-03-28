const { app, BrowserWindow, Menu, ipcMain, dialog } = require("electron");
//BrowserWindow module is used to create Chromium based windows that act like a Windows / MacOS executables.

//REQUIREMENTS
const ffmpeg = require("fluent-ffmpeg");
const ffmpeg_static = require("ffmpeg-static-electron");
const ffprobe_static = require("ffprobe-static-electron");

const ProgressBar = require("electron-progressbar");

ffmpeg.setFfmpegPath(ffmpeg_static.path);
ffmpeg.setFfprobePath(ffprobe_static.path);

//Start
const isMac = process.platform === "darwin";
let originPath;

//Menu module is used to design application menus for the application

const menuTemplate = [
  {
    label: "File",
    submenu: [
      {
        label: "Video",
        submenu: [
          {
            label: "Load...",
            click(event, focusedWindow) {
              dialog
                .showOpenDialog(focusedWindow, {
                  filters: [
                    {
                      name: "Movies",
                      extensions: ["mpg", "mpeg", "avi", "mov", "mkv", "mp4"],
                    },
                  ],
                  properties: ["openFile"],
                })
                .then((result) => {
                  if (!result.canceled) {
                    console.log(result);
                    //send data to window process
                    focusedWindow.webContents.send(
                      "fileSelected",
                      result.filePaths[0]
                    );

                    originPath = result.filePaths[0];

                    Menu.getApplicationMenu().getMenuItemById(
                      "status_avi"
                    ).enabled = true;

                    Menu.getApplicationMenu().getMenuItemById(
                      "status_mp4"
                    ).enabled = true;

                    Menu.getApplicationMenu().getMenuItemById(
                      "status_webm"
                    ).enabled = true;
                  }
                });
            },
          },
          { type: "separator" },
          { role: "quit" },
        ],
      },
      { type: "separator" },
      {
        id: "status_avi",
        label: "Convert to AVI...",
        enabled: false,
        click() {
          convertVideo("avi");
        },
      },
      {
        id: "status_mp4",
        label: "Convert to MP4...",
        enabled: false,
        click() {
          convertVideo("mp4");
        },
      },
      {
        id: "status_webm",
        label: "Convert to WEBM...",
        enabled: false,
        click() {
          convertVideo("webm");
        },
      },
    ],
  },
  {
    label: "Developer",
    submenu: [{ role: "toggleDevTools" }],
  },
];

if (isMac) {
  menuTemplate.unshift({
    //workaround for Mac for proper menu placement
    label: "placeholder",
    submenu: [{ role: "quit" }],
  });
}

menuFin = Menu.buildFromTemplate(menuTemplate);

Menu.setApplicationMenu(menuFin);

let mainWindow;

app.on("ready", () => {
  console.log("Application Ready");

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 605,
    resizable: false,
    webPreferences: {
      nodeIntegration: true, //to have our windows also have access to node runtime
      contextIsolation: false, //process isolation
      //everything is running in one big process as a result of this
    },
  });
  mainWindow.loadFile("index.html");
});

ipcMain.on("fileSelected", (event, selectedFile) => {
  console.log(selectedFile);
});

function convertVideo(fileType) {
  dialog
    .showSaveDialog(mainWindow, {
      title: "Save Video (Converted)",
      defaultPath: app.getPath("videos") + "/converted." + fileType + "",
      buttonLabel: "Conversion format: " + fileType + "",
      filters: [{ name: fileType, extensions: [fileType] }]
    })
    .then((filePath_obj) => {
      if (!filePath_obj.canceled) {
        let progressBar = new ProgressBar({
          browserWindow: { parent: mainWindow },
          indeterminate: false,
          text: "Preparing your video...",
          detail: "Ongoing conversion...",
        });

        ffmpeg(originPath)
          .format(fileType)
          .on("end", function () {
            console.log("OPERATION COMPLETE.");
            progressBar.close();
          })
          .on("progress", function (stdout, stderr) {
            console.log(stdout);
            let currentPercent = stdout.percent.toFixed(2);
            progressBar.value = Number(currentPercent);
            progressBar.detail = currentPercent + "% / 100% done...";
          })
          .save(filePath_obj.filePath);
      } else {
        console.log("CANCELLED.");
      }
    });
}
