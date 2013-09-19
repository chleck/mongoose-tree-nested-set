var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Types.ObjectId;

var rootId = ObjectId('000000000000000000000000');

function Plugin(schema, options) {

  options = options || {};

  schema.add({ _tree: {
    p: { type: Schema.ObjectId },
    l: { type: Number, min: 0 },
    r: { type: Number, min: 0 },
    lvl: { type: Number, min: 0 }
  }});

  schema.statics.rootId = rootId;

  schema
    .virtual('rootId')
    .get(function() {
      return rootId;
    });

  schema
    .virtual('parentId')
    .get(function() {
      // Return new parent id if defined or current parent id or root id
      return this._tree._p || this._tree.p || rootId;
    })
    .set(function(id) {
      // Just set a new parent id
      this._tree._p = id;
    });

  schema
    .virtual('level')
    .get(function() {
      return this._tree.lvl;
    });

  // Create or move node
  schema.pre('save', function(next) {
    var self = this;
    // Root node
    if(self._id.equals(rootId)) {
      self._tree.p = undefined;
      self._tree.l = 1;
      self._tree.r = self._tree.r || 2;
      self._tree.lvl = 0;
      return next();
    }
    // Parent is not changed
    if(typeof self._tree.p !== 'undefined' && self._tree.p.equals(self.parentId)) return next();
    // Add node
    if(typeof self._tree.p === 'undefined') {
      console.log('Add node');
      self.constructor.findById(self.parentId, function(err, parent) {
        if(err) return console.log('Can\'t get parent:', err);
        var r = parent._tree.r;
          // , lvl = parent._tree.lvl + 1;
        self.constructor.update(
          { '_tree.l': { $gt: r }},
          { $inc: { '_tree.l': 2, '_tree.r': 2 }},
          { multi: true },
          function(err) {
            if(err) return console.log('Can\'t update branch:', err);
            self.constructor.update(
              { '_tree.r': { $gte: r }, '_tree.l': { $lt: r }},
              { $inc: { '_tree.r': 2 }},
              { multi: true },
              function(err) {
                if(err) return console.log('Can\'t update branch:', err);
                self._tree.p = parent._id;
                self._tree.l = r;
                self._tree.r = r + 1;
                self._tree.lvl = parent._tree.lvl + 1;
                next();
              }
            )
          }
        )
      })
    }
    // Move node
    else {
      console.log('Not implemented!');
    }
  });
  // Destroy node
  schema.pre('remove', function(next) {
    var self = this;
    self.constructor.remove(
      { '_tree.l': { $gt: self._tree.l }, '_tree.r': { $lt: self._tree.r }},
      function(err) {
        if(err) return console.log('Can\'t remove branch:', err);
        self.constructor.update(
          { '_tree.r': { $gt: self._tree.r }, '_tree.l': { $lt: self._tree.l }},
          { $inc: { '_tree.r': self._tree.l - self._tree.r - 1 }},
          { multi: true },
          function(err) {
            if(err) return console.log('Can\'t remove branch:', err);
            self.constructor.update(
              { '_tree.l': { $gt: self._tree.r }},
              { $inc: { '_tree.l': self._tree.l - self._tree.r - 1, '_tree.r': self._tree.l - self._tree.r - 1 }},
              { multi: true },
              function(err) {
                if(err) return console.log('Can\'t remove branch:', err);
                next();
              }
            )
          }
        )
      }
    )
  });
  // Select branch
  schema.method('branch', function() {
    return this.constructor.find()
      .where('_tree.l').gte(this._tree.l)
      .where('_tree.r').lte(this._tree.r)
      .select('_tree')
      .sort('_tree.l');
  });

  schema.method('ancestors', function() {
    // SELECT id, name, level FROM my_tree WHERE left_key <= $left_key AND right_key >= $right_key ORDER BY left_key
  });

  schema.method('ancestorsAndBranch', function() {
    // SELECT id, name, level FROM my_tree WHERE right_key > $left_key AND left_key < $right_key ORDER BY left_key
  });
}

module.exports = Plugin;
