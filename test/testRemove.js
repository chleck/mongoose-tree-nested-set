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

Test.find({ name: 1 }).sort('_tree.l').limit(1).exec(function(err, node) {
  if(err) console.log(err);
  console.log(node[0]);
  node[0].remove(function(err) {
    if(err) console.log(err);
    process.exit();
  });
})
