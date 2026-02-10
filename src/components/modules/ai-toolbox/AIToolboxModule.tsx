import { useTranslation } from 'react-i18next';
import { TextToImage } from './TextToImage';
import { TextToVideo } from './TextToVideo';
import { AppPlaza } from './AppPlaza';
import { BrandHealth } from './BrandHealth';
import { TikTokInsights } from './TikTokInsights';
import { VideoReplication } from './VideoReplication';

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
    
    // Market Insights
    case 'brand-health':
      return <BrandHealth onNavigate={onNavigate} />;
    case 'tiktok-insights':
      return <TikTokInsights onNavigate={onNavigate} />;
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
      return <VideoReplication onNavigate={onNavigate} />;
    
    // Digital Human
    case 'digital-human':
      return <PlaceholderPage title={t('placeholder.digitalHuman')} description={t('placeholder.digitalHumanDesc')} />;
    
    default:
      return <AppPlaza onNavigate={onNavigate} />;
  }
}