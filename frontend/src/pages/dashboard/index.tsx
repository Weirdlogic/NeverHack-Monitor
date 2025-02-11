import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AttackOverview from '../../components/dashboard/AttackTimeline';
import StatusGrid from '../../components/dashboard/StatusGrid';
import { motion } from 'framer-motion';
import { Target } from '../../types/api.types';
import Analysis from './analysis';

const DashboardPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const fromSearch = location.state?.fromSearch;
  const selectedTarget = location.state?.selectedTarget as Target;
  const targetDetails = location.state?.targetDetails;

  return (
    <div className="space-y-6 p-6">
      {fromSearch && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center text-gray-600 hover:text-gray-900"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Search
        </motion.button>
      )}

      {fromSearch && selectedTarget ? (
        <Analysis initialTarget={selectedTarget} initialDetails={targetDetails} />
      ) : (
        <>
          <StatusGrid />
          <AttackOverview />
        </>
      )}
    </div>
  );
};

export default DashboardPage;