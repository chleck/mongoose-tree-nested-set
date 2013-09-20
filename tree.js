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

  schema.index({ parentId: 1 });
  schema.index({ lft: 1, rgt: 1 });
  schema.index({ rgt: 1 });

  // Create or move node
  // ADD TO TREE ONLY NEWLY CREATED NODES !!! USE .move() FOR ANY EXISTENT NODE !!!
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
  // Rebuild the tree using parent links (_tree.p)
  schema.static('rebuild', function(done) {
    var self = this
      , right = 1
      , lvl = 0;
    // Start build from the root node
    node(self.rootId, 1, done);
    function node(id, left, next) {
      lvl++;
      self.find({ '_tree.p': id }, function(err, children) {
        if(err) return next(err);
        var i = 0;
        eachChild();
        function eachChild(err) {
          if(err) return next(err);
          // Calculate each child
          if(i < children.length) return node(children[i++].id, ++right, eachChild);
          // Update current node
          self.update({ _id: id }, { '_tree.l': left, '_tree.r': ++right, '_tree.lvl': --lvl }, next);
        }
      })
    }
  })
  // Id of the root node (through model)
  schema.statics.rootId = rootId;
  // Id of the root node (through document)
  schema
    .virtual('rootId')
    .get(function() {
      return rootId;
    });
  // Number of hops to the root node
  schema
    .virtual('level')
    .get(function() {
      return this._tree.lvl;
    });
  // ???
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
  // Return true if the node is a leaf (has no children)
  schema.method('isLeaf', function() {
    return this._tree.r - this._tree.l === 1;
  });
  // Returns true if the node is a descendant of other
  schema.method('isDescendantOf', function(other) {
    return this._tree.l > other._tree.l && this._tree.r < other._tree.r;
  });
  // Returns true if the node is an ancestor of other
  schema.method('isAncestorOf', function(other) {
    return this._tree.l < other._tree.l && this._tree.r > other._tree.r;
  });
  // Select parent node
  schema.method('parent', function() {
    return this.constructor.findOne({ _id: this._tree.p });
  });
  // Select children
  schema.method('children', function(sort) {
    var query = this.constructor.find({ '_tree.p': this._id});
    if(sort) query = query.sort('_tree.l')
    return query;
  });
  // Select descendants
  schema.method('descendants', function(sort) {
    var query = this.constructor.find()
      .where('_tree.l').gte(this._tree.l)
      .where('_tree.r').lte(this._tree.r);
    if(sort) query = query.sort('_tree.l')
    return query;
  });
  // Select ancestors
  schema.method('ancestors', function(sort) {
    var query = this.constructor.find()
      .where('_tree.l').lte(this._tree.l)
      .where('_tree.r').gte(this._tree.r);
    if(sort) query = query.sort('_tree.l')
    return query;
  });
  // Select branch (ancestors, self and descendants)
  schema.method('branch', function(sort) {
    var query = this.constructor.find()
      .where('_tree.r').gt(this._tree.l)
      .where('_tree.l').lt(this._tree.r);
    if(sort) query = query.sort('_tree.l')
    return query;
  });
  // Select siblings (all nodes with the same parent)
  schema.method('siblings', function(sort) {
    var query = this.constructor.find({ '_tree.p': this._tree.p });
    if(sort) query = query.sort('_tree.l')
    return query;
  });
  // Find leafs
  schema.static('leafs', function(sort) {
    var query = this.$where('this._tree.r - this._tree.l === 1');
    if(sort) query = query.sort('_tree.l')
    return query;
  });
  // Find leafs in descendants
  schema.method('leafs', function(sort) {
    var query = this.descendants().$where('this._tree.r - this._tree.l === 1');
    if(sort) query = query.sort('_tree.l')
    return query;
  });
}

module.exports = Plugin;
