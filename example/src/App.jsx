import { useState } from 'react';

function App() {
  const [state, setState] = useState(null);

  return (
    <div className="App">
     <button onClick={async () => {
        const res = await (await fetch('/')).json()
        setState(res)
     }}>fetch</button>

     <pre>
       <code>{state ? JSON.stringify(state, null, 4) : null}</code>
     </pre>
    </div>
  );
}

export default App;
