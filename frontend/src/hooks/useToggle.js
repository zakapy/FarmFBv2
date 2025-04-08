import { useState } from 'react';

const useToggle = (initial = false) => {
  const [state, setState] = useState(initial);
  const toggle = () => setState((s) => !s);
  const setTrue = () => setState(true);
  const setFalse = () => setState(false);

  return [state, toggle, setTrue, setFalse];
};

export default useToggle;
