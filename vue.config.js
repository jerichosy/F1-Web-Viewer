const info = require("./package.json");

process.env.VUE_APP_VERSION = info.version;
process.env.VUE_APP_HOMEPAGE = info.homepage;

module.exports = {
  devServer: {
    proxy: "http://localhost:" + (process.env.SERVER_PORT || 3000)
  },
  outputDir: "./dist/web",
  pages: {
    index: {
      entry: "./src/main.js",
      title: "F1 Web Viewer"
    }
  },
  css: {
    loaderOptions: {
      scss: {
        prependData: "@import '@/assets/main.scss';"
      }
    }
  },
  transpileDependencies: ["vue-grid-layout"]
};
