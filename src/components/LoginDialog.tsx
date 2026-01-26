import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { redirectToLogin } from "@/services/oauthApi";

interface LoginDialogProps {
  open: boolean;
}

/**
 * 登录弹窗组件
 * 不可关闭，必须点击按钮跳转到登录页面
 */
export function LoginDialog({ open }: LoginDialogProps) {
  const handleLogin = () => {
    redirectToLogin();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>请先登录</DialogTitle>
          <DialogDescription>
            您需要登录后才能使用此功能，请点击下方按钮跳转到登录页面。
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={handleLogin} className="w-full">
            前往登录
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
