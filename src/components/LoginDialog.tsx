import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { redirectToLogin } from "@/services/oauthApi";
import { useTranslation } from 'react-i18next';

interface LoginDialogProps {
  open: boolean;
}

/**
 * 登录弹窗组件
 * 不可关闭，必须点击按钮跳转到登录页面
 */
export function LoginDialog({ open }: LoginDialogProps) {
  const { t } = useTranslation();
  const handleLogin = () => {
    redirectToLogin();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
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
