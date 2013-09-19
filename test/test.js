var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , mongooseTree = require('../tree');

var testSchema = new Schema({
  name: String
});

testSchema.plugin(mongooseTree);

var Test = mongoose.model('Test', testSchema);

mongoose.connect('mongodb://localhost/test');

function createRoot(next) {
  Test.findById(Test.rootId, function(err, root) {
    if(err) return next(err);
    if(root) return next();
    console.log('Creating root node...');
    var root = new Test();
    root._id = Test.rootId;
    root.name = 'Root';
    root.save(function(err) {
      if(!err) console.log('Root node created successfully.');
      next(err);
    });
  })
}

createRoot(function(err) {
  if(err) { console.log('Can\'t create root node:', err); process.exit(); }
  var test = new Test({ name: '1' });
  test.parent = Test.rootId;
  test.save(function(err) {
    if(err) console.log(err);
    Test.find({ name: 1 }).sort('_tree.l').limit(1).exec(function(err, node) {
      if(err) console.log(err);
      var next = new Test({ name: 2 });
      next.parentId = node[0]._id;
      next.save(function(err) {
        if(err) console.log(err);
        process.exit();
      })
    })
  });
});
