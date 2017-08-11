---
categories: Windows-Phone
---

The Windows Phone 8.0 SDK is out, and while most sink their teeth into its cavalcade of new features, 
a few may encounter a small road bump when moving to the RTW version; as I did.

After moving from a pre-release version of the Windows Phone 8 SDK to the RTW, 
I found that I was unable to launch the Windows Phone emulator because of a networking issue. 
The emulator would pop up the following error message at the beginning of a debugging session:

The Windows Phone Emulator wasn't able to connect to the Windows Phone operating system: 
The emulator couldn't determine the host IP address, which is used to communicate with the guest virtual machine. 
Some functionality may be disabled.

This turned out to be a hair pulling exercise. The cause was related to the Hyper-v virtual switch configuration.

I resolved the issue by performing the following steps:

1. Uninstall the Windows Phone 8.0 SDK.
2. Uninstall and reinstall the virtual switches using:  
	C:> netcfg -u vms_pp  
	C:> netcfg -c p -i vms_pp  
3. Reboot 
4. Reinstall the SDK.

 If you encounter the same issue, here's hoping this post sorts you out.