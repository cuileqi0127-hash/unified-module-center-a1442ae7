import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { redirectToLogin } from "@/services/oauthApi";
import { useTranslation } from 'react-i18next';

interface LoginDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * 登录弹窗组件
 * 点击「去登录」后先关闭弹窗，再跳转登录页
 */
export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const { t } = useTranslation();
  const handleLogin = () => {
    onOpenChange?.(false);
    redirectToLogin();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange ?? (() => {})}>
      <DialogContent 
        className="sm:max-w-sm [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t('login.title')}</DialogTitle>
          <DialogDescription>
            {t('login.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={handleLogin} className="w-full">
            {t('login.goToLogin')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
