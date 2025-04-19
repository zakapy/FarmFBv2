import { useSelector, useDispatch } from 'react-redux';
import {
  fetchAccounts,
  addAccount,
  editAccount,
  removeAccount,
  createDolphinProfile,
} from '../features/accounts/accountsSlice';

const useAccounts = () => {
  const dispatch = useDispatch();
  const { list, loading, error, fbCreator } = useSelector((state) => state.accounts);

  const loadAccounts = () => dispatch(fetchAccounts());
  const create = (data) => dispatch(addAccount(data));
  const update = (id, data) => dispatch(editAccount({ id, data }));
  const remove = (id) => dispatch(removeAccount(id));
  const createDolphin = (proxyData) => dispatch(createDolphinProfile(proxyData));

  return {
    accounts: list,
    loading,
    error,
    fbCreator,
    loadAccounts,
    create,
    update,
    remove,
    createDolphin,
  };
};

export default useAccounts;
