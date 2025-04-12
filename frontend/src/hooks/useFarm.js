import { useSelector, useDispatch } from 'react-redux';
import {
  startFarm,
  getFarmStatus,
  stopFarm,
  getFarmHistory,
  getFarmDetails,
  clearCurrentFarm,
  clearFarmDetails
} from '../features/farm/farmSlice';

const useFarm = () => {
  const dispatch = useDispatch();
  const {
    currentFarm,
    currentStatus,
    farmHistory,
    farmDetails,
    loading,
    error
  } = useSelector((state) => state.farm);

  return {
    // Состояние
    currentFarm,
    currentStatus,
    farmHistory,
    farmDetails,
    loading,
    error,

    // Методы
    startFarming: (accountId, settings) => dispatch(startFarm({ accountId, settings })),
    getStatus: (accountId) => dispatch(getFarmStatus(accountId)),
    stopFarming: (farmId) => dispatch(stopFarm(farmId)),
    getHistory: (options) => dispatch(getFarmHistory(options)),
    getDetails: (farmId) => dispatch(getFarmDetails(farmId)),
    clearFarm: () => dispatch(clearCurrentFarm()),
    clearDetails: () => dispatch(clearFarmDetails())
  };
};

export default useFarm;