(function () {
  const routes = new Map();

  function register(path, component) { routes.set(path, component); }
  function get(path) { return routes.get(path) || null; }
  function list() { return [...routes.keys()]; }

  function currentPath() {
    const h = window.location.hash.replace(/^#\/?/, "/");
    return h === "/" ? "/dashboard" : h;
  }

  function navigate(path) {
    window.location.hash = path.startsWith("/") ? path : "/" + path;
  }

  function useRoute() {
    const [path, setPath] = React.useState(currentPath);
    React.useEffect(() => {
      const handler = () => setPath(currentPath());
      window.addEventListener("hashchange", handler);
      return () => window.removeEventListener("hashchange", handler);
    }, []);
    return path;
  }

  window.CONTRACT_ROUTER = { register, get, list, currentPath, navigate, useRoute };
})();
