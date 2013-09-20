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

Test.rebuild(function(err) {
  if(err) return console.log(err);
  console.log('Done!');
  Test.findOne({ name: 'Root' }).exec(function(err, node) {
    if(err) return console.log('Error:', err);
    node.branch(true).select('_tree name').exec(function(err, branch) {
      if(err) return console.log('Error:', err);
      for(var i in branch) {
        var node = branch[i];
        console.log(pad(node.level) + node._id + ' ' + node.name + ' (' + node._tree.l + ', ' + node._tree.r + ')');
      }
      process.exit();
    })
  })
})
