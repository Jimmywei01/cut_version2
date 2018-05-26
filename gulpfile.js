const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const mainBowerFiles = require('main-bower-files'); //僅從 Bower 軟體包中提取所需文件的工具
const browserSync = require('browser-sync');
const autoprefixer = require('autoprefixer'); // 前輟詞 require 不用加 gulp
const minimist = require('minimist'); // 用來讀取指令轉成變數
const gulpSequence = require('gulp-sequence').use(gulp);  //將所有task(任務)按順序運行


// production || development
// # gulp --env production 發布版本
// gulp build --env production 發布流程
const envOptions = {
  string: 'env',
  default: { env: 'development' }
};
// 預設得內容
const options = minimist(process.argv.slice(2), envOptions);
// console.log(options);
//刪除文件和文件夾
gulp.task('clean', () => {
  return gulp.src(['./public', './.tmp'], { read: false }) 
    .pipe($.clean());
});

gulp.task('jade', () => {
  return gulp.src(['./src/**/*.jade'])
    .pipe($.plumber())                        //语法报错时，整个运行流程还会继续走下去，不退
    .pipe($.jade({ pretty: true }))
    .pipe(gulp.dest('./public'))
    .pipe(browserSync.reload({
      stream: true,
    }));
});

gulp.task('babel', function () {
  return gulp.src(['./src/js/**/*.js'])
    .pipe($.plumber())
    .pipe($.sourcemaps.init())   // 找出合併檔
    .pipe($.concat('all.js'))
    .pipe($.babel({              // 要轉譯成的版本
      presets: ['es2015']
    }))
    .pipe(
        $.if(options.env === 'production', $.uglify({
          compress: {drop_console: true}
          })))
    .pipe($.sourcemaps.write('.'))      // 合併檔的來源
    .pipe(gulp.dest('./public/js'))
    .pipe(browserSync.reload({
      stream: true
    }));
});

// 框架版本控制
gulp.task('bower', function () {
  return gulp.src(mainBowerFiles())
    .pipe(gulp.dest('./.tmp/vendors'));
  cb(err);
});
// 把 bower 加入為了到 vender.js 執行 ,[] -> 優先執行
// 載入 bootstrap 4 前  必須先載入 jQuery & popper 所以使用 bundle 版本先載入
gulp.task('vendorJs', ['bower'], function () {     
  return gulp.src([
    './.tmp/vendors/**/**.js',
    './node_modules/bootstrap/dist/js/bootstrap.bundle.min.js', 
  ])
  .pipe($.order([  //使用相同的語法重新排序文件
    'jquery.js'
  ]))
  .pipe($.concat('vendor.js'))
  .pipe($.if(options.env === 'production', $.uglify()))
  .pipe(gulp.dest('./public/js'))
})

//- includePaths：額外載入資源 (路徑)
//- outputStyle: 匯出格式  nested:默認
gulp.task('sass', function () {
  // PostCSS AutoPrefixer
  var processors = [          // 插建 控制瀏覽器版本
    autoprefixer({browsers: ['last 5 version' ,'> 5%', 'ie 6-8']})
  ];
  return gulp.src(['./src/css/*.sass', './src/css/*.scss']) 
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.sass({                                  // 載入外部sass資源(自定義liberary)
      outputStyle: 'nested',
      includePaths: ['./node_modules/bootstrap/scss',
      ]}).on('error', $.sass.logError))
    .pipe($.postcss(processors))  // 編譯css
    .pipe($.concat('main.css')) // 合併檔
    .pipe($.if(options.env === 'production', $.cleanCss())) // 假設開發環境則壓縮 CSS
    .pipe($.sourcemaps.write('.'))  // 找出合併檔的檔案
    .pipe(gulp.dest('./public/css'))
    .pipe(browserSync.reload({
      stream: true
    }));
});

gulp.task('imageMin', function () {
  gulp.src('./src/images/*')
    .pipe($.if(options.env === 'production', $.imagemin()))  
    .pipe(gulp.dest('./public/images'));
});

// 本地伺服器
// 一定要用 index.jade 命名 並放在 css js 資料夾上層 否則抓不到
//browserSync在本地建立基礎開啟的目錄位置
gulp.task('browserSync', function () {
  browserSync.init({
    server: { baseDir: './public' },  
    reloadDebounce: 2000
  })
  // gulp.watch('./public/css/*.css').on('change', browserSync.reload);  //sass 無法自動更新頁面(未監聽到) 加入這句監聽
});

gulp.task('watch', function () {
  gulp.watch(['./srccss/**/*.sass', './src/css/**/*.scss'], ['sass']);
  gulp.watch(['./src/**/*.jade'], ['jade']);
  gulp.watch(['./src/js/**/*.js'], ['babel']);
  gulp.watch('./src/images/**/*', ['image-min']);
});

// 將 public branch 上 git (前提要先將檔案上git)
gulp.task('deploy', function () {
  return gulp.src('./public/**/*')
    .pipe($.ghPages());
});

// 發佈模式
gulp.task('sequence', gulpSequence('clean', 'jade', 'sass', 'babel', 'vendorJs', 'imageMin'));
gulp.task('build', ['sequence'])

// 開發模式
gulp.task('default', ['jade', 'sass', 'babel', 'vendorJs', 'browserSync', 'imageMin', 'watch']);

