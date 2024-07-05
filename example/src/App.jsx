import { useState } from 'react';

const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE'];

function App() {
  const [method, setMethod] = useState(methods[0]);
  const [endpoint, setEndpoint] = useState('/pet/1');
  const [res, setRes] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="App">
      <h2>API mock playground</h2>
      <label>Method</label>
      <select value={method} onChange={e => setMethod(e.target.value)}>
        {methods.map(i => (
          <option key={i} value={i}>
            {i}
          </option>
        ))}
      </select>
      <br />
      <label>Endpoint: </label>
      <input type="text" value={endpoint} onChange={e => setEndpoint(e.target.value)} />
      <br />
      <button
        type="button"
        onClick={async () => {
          try {
            setLoading(true);
            const res = await fetch(endpoint, { method });
            setStatus(res.status);
            const data = await res.json();
            setRes(data);
          } catch (e) {
            setRes(e);
          } finally {
            setLoading(false);
          }
        }}
      >
        fetch
      </button>

      {loading && <div>Loading...</div>}
      {status && <div>Status: {status}</div>}

      <pre>
        <code>{res ? JSON.stringify(res, null, 4) : 'null'}</code>
      </pre>
    </div>
  );
}

export default App;
