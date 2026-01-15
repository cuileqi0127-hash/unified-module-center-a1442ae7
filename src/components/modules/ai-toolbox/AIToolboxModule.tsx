import { TextToImage } from './TextToImage';
import { AppPlaza } from './AppPlaza';
import { BrandHealth } from './BrandHealth';

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
  switch (activeItem) {
    // Home
    case 'app-plaza':
      return <AppPlaza onNavigate={onNavigate} />;
    
    // Market Insights
    case 'brand-health':
      return <BrandHealth onNavigate={onNavigate} />;
    case 'trend-analysis':
      return <PlaceholderPage title="Trend Analysis" description="Analyze market trends and discover emerging opportunities." />;
    case 'competitor-monitor':
      return <PlaceholderPage title="Competitor Monitor" description="Track and monitor competitor activities and strategies." />;
    
    // Marketing Planning
    case 'campaign-planner':
      return <PlaceholderPage title="Campaign Planner" description="Plan and organize your marketing campaigns." />;
    case 'copywriting-assistant':
      return <PlaceholderPage title="Copywriting Assistant" description="AI-powered copywriting for your marketing materials." />;
    
    // Image Generation
    case 'text-to-image':
      return <TextToImage onNavigate={onNavigate} />;
    case 'ecommerce-assets':
      return <PlaceholderPage title="E-commerce Assets 电商素材图" description="Generate product images and e-commerce visual assets." />;
    case 'reference-to-image':
      return <PlaceholderPage title="Reference-to-Image 素材库对标生图" description="Generate images based on reference materials from your library." />;
    
    // Video Generation
    case 'text-to-video':
      return <PlaceholderPage title="Text-to-Video 文生视频" description="Generate videos from text descriptions." />;
    case 'reference-to-video':
      return <PlaceholderPage title="Reference-to-Video 素材库对标生视频" description="Generate videos based on reference materials." />;
    
    // Digital Human
    case 'digital-human':
      return <PlaceholderPage title="Digital Human 数字人生成" description="Create AI-powered digital human avatars." />;
    
    default:
      return <AppPlaza onNavigate={onNavigate} />;
  }
}