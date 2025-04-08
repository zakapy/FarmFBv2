import { useSelector, useDispatch } from 'react-redux';
import {
  fetchAccounts,
  addAccount,
  editAccount,
  removeAccount,
} from '../features/accounts/accountsSlice';

const useAccounts = () => {
  const dispatch = useDispatch();
  const { list, loading, error } = useSelector((state) => state.accounts);

  const loadAccounts = () => dispatch(fetchAccounts());
  const create = (data) => dispatch(addAccount(data));
  const update = (id, data) => dispatch(editAccount({ id, data }));
  const remove = (id) => dispatch(removeAccount(id));

  return {
    accounts: list,
    loading,
    error,
    loadAccounts,
    create,
    update,
    remove,
  };
};

export default useAccounts;
