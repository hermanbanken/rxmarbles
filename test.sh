browserify -d -u rx -u assert -t babelify \
  --noparse rxmarbles \
  test/marble-construction.js \
  test/collection-pluck.js \
  test/lib-usage.js \
  --outfile dist/js/test.js
mocha dist/js/test.js
