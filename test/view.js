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

function pad(n) {
  var s = '';
  while(n--) s += '  ';
  return s;
}

// Test.find().sort('_tree.l').exec(function(err, tree) {
//   if(err) return console.log('Error:', err);
//   for(var i in tree) {
//     var node = tree[i];
//     console.log(pad(node.level) + node.name + ' (' + node._tree.l + ', ' + node._tree.r + ')');
//   }
//   process.exit();
// })

Test.findOne({ name: 'Root' }).sort('_tree.l').exec(function(err, node) {
  if(err) return console.log('Error:', err);
  node.branch(true).select('_tree name').exec(function(err, branch) {
    if(err) return console.log('Error:', err);
    for(var i in branch) {
      var node = branch[i];
      console.log(pad(node.level) + node._id + ' ' + node.name + ' (' + node._tree.l + ', ' + node._tree.r + ')');
    }
    process.exit();
    // Test.leafs().exec(function(err, leafs) {
    //   for(var i in leafs) console.log(leafs[i].name);
    //   process.exit();
    // })
  })
})

