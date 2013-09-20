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

Test.find({ name: 'Root' }).sort('_tree.l').limit(1).exec(function(err, node) {
  if(err) console.log(err);
  console.log(node[0]);
  node[0].leafs(true).sort('name').exec(function(err, leafs) {
    if(err) console.log(err);
    for(var i in leafs) console.log(leafs[i].name);
    process.exit();
  });
})
