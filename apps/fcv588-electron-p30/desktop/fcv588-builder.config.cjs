"use strict";
const path = require("node:path");

const root = path.resolve(__dirname, "..");

module.exports = {
  appId: "vn.mophongmaytrentau.fcv588.standalone",
  productName: "FURUNO FCV-588 Simulator",
  executableName: "FCV-588-Simulator",
  directories: {
    app: path.join(root, "bundle"),
    output: path.join(root, "..", "..", "dist", "electron"),
  },
  files: ["**/*"],
  asar: true,
  npmRebuild: false,
  buildDependenciesFromSource: false,
  nodeGypRebuild: false,
  publish: null,
  win: {
    target: ["nsis", "portable"],
    signAndEditExecutable: true,
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "FURUNO FCV-588 Simulator",
    artifactName: "${productName} Setup ${version}.${ext}",
  },
  portable: {
    artifactName: "FCV-588-Portable-${version}-win-x64.${ext}",
  },
};
