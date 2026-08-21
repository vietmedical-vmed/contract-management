(function () {
  var _filters = { mien: "", khay: "" };
  var _listeners = new Set();

  function get() { return Object.assign({}, _filters); }

  function set(updates) {
    var changed = false;
    for (var k in updates) {
      if (_filters.hasOwnProperty(k) && _filters[k] !== updates[k]) {
        _filters[k] = updates[k];
        changed = true;
      }
    }
    if (changed) _listeners.forEach(function (fn) { fn(get()); });
  }

  function subscribe(fn) {
    _listeners.add(fn);
    return function () { _listeners.delete(fn); };
  }

  function useFilters() {
    var ref = React.useState(get);
    React.useEffect(function () { return subscribe(ref[1]); }, []);
    return ref[0];
  }

  window.CONTRACT_FILTERS = { get: get, set: set, useFilters: useFilters };
})();
