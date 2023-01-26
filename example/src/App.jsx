import { useState } from 'react';

function App() {
  const [endpoint, setEndpoint] = useState('/admin/tokens');
  const [res, setRes] = useState(null);

  return (
    <div className="App">
      <h2>GitHub API mock playground</h2>
      <label>Endpoint: </label>
      <input
        type="text"
        value={endpoint}
        onChange={e => setEndpoint(e.target.value)}
      />
      <button
        onClick={async () => {
          const res = await fetch(endpoint);
          const data = await res.json();
          setRes(data);
        }}
      >
        fetch
      </button>

      <pre>
        <code>{res ? JSON.stringify(res, null, 4) : null}</code>
      </pre>
    </div>
  );
}

export default App;
