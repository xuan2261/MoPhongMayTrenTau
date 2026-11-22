// P30: offline training installer staging only. Runtime files come exclusively from bundle/.
const path = require("node:path");
const root = path.resolve(__dirname, "..");
module.exports = {
  appId: "vn.mophongmaytrentau.fcv588.synthetic.poc",
  productName: "FCV588 Synthetic Training POC UNRELEASED",
  executableName: "FCV588-Synthetic-POC",
  directories: { app: path.join(root, "bundle-host-upgrade-0.0.2"), output: path.join(root, "dist-p30-host-upgrade-0.0.2") },
  files: ["**/*"],
  asar: true,
  electronVersion: "45.4.1",
  npmRebuild: false,
  buildDependenciesFromSource: false,
  nodeGypRebuild: false,
  publish: null,
  win: { target: ["nsis"], artifactName: "P30-FCV588-Synthetic-Training-POC-UNRELEASED-${version}-win-x64.${ext}", signAndEditExecutable: true },
  nsis: {
    oneClick: true,
    perMachine: false,
    runAfterFinish: false,
    createDesktopShortcut: false,
    createStartMenuShortcut: true,
    deleteAppDataOnUninstall: false
  },
  afterPack: async (context) => {
    const { flipFuses, getCurrentFuseWire, FuseVersion, FuseV1Options, FuseState } = await import("@electron/fuses");
    const binary = path.join(context.appOutDir, "FCV588-Synthetic-POC.exe");
    const states = {
      RunAsNode: false,
      EnableCookieEncryption: true,
      EnableNodeOptionsEnvironmentVariable: false,
      EnableNodeCliInspectArguments: false,
      EnableEmbeddedAsarIntegrityValidation: true,
      OnlyLoadAppFromAsar: true,
      LoadBrowserProcessSpecificV8Snapshot: false,
      GrantFileProtocolExtraPrivileges: false,
      WasmTrapHandlers: true
    };
    const config = { version: FuseVersion.V1, strictlyRequireAllFuses: true };
    for (const [key, value] of Object.entries(states)) config[FuseV1Options[key]] = value;
    await flipFuses(binary, config);
    const readback = await getCurrentFuseWire(binary);
    for (const [key, value] of Object.entries(states)) {
      if (readback[FuseV1Options[key]] !== (value ? FuseState.ENABLE : FuseState.DISABLE)) {
        throw new Error("P30 fuse readback mismatch: " + key + "=" + readback[FuseV1Options[key]]);
      }
    }
    process.stdout.write("P30_FUSES_READBACK_PASS " + JSON.stringify(readback) + "\n");
  }
};
