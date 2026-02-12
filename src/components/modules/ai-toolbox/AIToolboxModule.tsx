import { useTranslation } from 'react-i18next';
import { TextToImage } from './TextToImage';
import { TextToVideo } from './TextToVideo';
import { AppPlaza } from './AppPlaza';

interface AIToolboxModuleProps {
  activeItem: string;
  onNavigate: (itemId: string) => void;
}

const PlaceholderPage = ({ title, description }: { title: string; description: string }) => (
  <div className="text-center py-20 animate-fade-in">
    <h2 className="text-xl font-semibold mb-2">{title}</h2>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

export function AIToolboxModule({ activeItem, onNavigate }: AIToolboxModuleProps) {
  const { t } = useTranslation();
  switch (activeItem) {
    // Home
    case 'app-plaza':
      return <AppPlaza onNavigate={onNavigate} />;
    
    // Market Insights（Coming Soon，禁止进入）
    case 'brand-health':
      return <PlaceholderPage title={t('common.comingSoon')} description={t('placeholder.brandHealthComingSoon')} />;
    case 'tiktok-insights':
      return <PlaceholderPage title={t('common.comingSoon')} description={t('placeholder.tiktokInsightsComingSoon')} />;
    case 'trend-analysis':
      return <PlaceholderPage title={t('placeholder.trendAnalysis')} description={t('placeholder.trendAnalysisDesc')} />;
    case 'competitor-monitor':
      return <PlaceholderPage title={t('placeholder.competitorMonitor')} description={t('placeholder.competitorMonitorDesc')} />;
    
    // Marketing Planning
    case 'campaign-planner':
      return <PlaceholderPage title={t('placeholder.campaignPlanner')} description={t('placeholder.campaignPlannerDesc')} />;
    case 'copywriting-assistant':
      return <PlaceholderPage title={t('placeholder.copywritingAssistant')} description={t('placeholder.copywritingAssistantDesc')} />;
    
    // Image Generation
    case 'text-to-image':
      return <TextToImage onNavigate={onNavigate} />;
    case 'ecommerce-assets':
      return <PlaceholderPage title={t('placeholder.ecommerceAssets')} description={t('placeholder.ecommerceAssetsDesc')} />;
    case 'reference-to-image':
      return <PlaceholderPage title={t('placeholder.referenceToImage')} description={t('placeholder.referenceToImageDesc')} />;
    
    // Video Generation
    case 'text-to-video':
      return <TextToVideo onNavigate={onNavigate} />;
    case 'reference-to-video':
      return <PlaceholderPage title={t('common.comingSoon')} description={t('placeholder.videoReplicationComingSoon')} />;
    
    // Digital Human
    case 'digital-human':
      return <PlaceholderPage title={t('placeholder.digitalHuman')} description={t('placeholder.digitalHumanDesc')} />;
    
    default:
      return <AppPlaza onNavigate={onNavigate} />;
  }
}