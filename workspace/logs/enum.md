# Baseline Enumeration: synthetic_test
## File
workspace/binaries/synthetic_test: ELF 64-bit LSB executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=63faab967cc7ec7617983d07fd8c787221c576dc, for GNU/Linux 3.2.0, with debug_info, not stripped
## Exported/global symbols
0000000000403e08 d _DYNAMIC
0000000000403fe8 d _GLOBAL_OFFSET_TABLE_
0000000000402000 R _IO_stdin_used
0000000000402160 r __FRAME_END__
0000000000402010 r __GNU_EH_FRAME_HDR
0000000000404048 D __TMC_END__
000000000040038c r __abi_tag
0000000000404048 B __bss_start
0000000000404038 D __data_start
00000000004011c0 t __do_global_dtors_aux
0000000000403e00 d __do_global_dtors_aux_fini_array_entry
0000000000404040 D __dso_handle
0000000000403df8 d __frame_dummy_init_array_entry
0000000000401140 T _dl_relocate_static_pie
0000000000404048 D _edata
0000000000404050 B _end
000000000040131c T _fini
0000000000401000 T _init
0000000000401110 T _start
0000000000404048 b completed.0
0000000000404038 W data_start
0000000000401150 t deregister_tm_clones
00000000004011f0 t frame_dummy
00000000004012a0 T main
0000000000401180 t register_tm_clones
0000000000401237 T vuln_memcpy
00000000004011f6 T vuln_strcpy
0000000000401266 T vuln_uaf
## Dynamic imports (danger funcs)
0000000000404000 R_X86_64_JUMP_SLOT  free@GLIBC_2.2.5
0000000000404008 R_X86_64_JUMP_SLOT  strcpy@GLIBC_2.2.5
0000000000404020 R_X86_64_JUMP_SLOT  memcpy@GLIBC_2.14
0000000000404028 R_X86_64_JUMP_SLOT  malloc@GLIBC_2.2.5
## Strings (sample)
/lib64/ld-linux-x86-64.so.2
strcpy
puts
free
atoi
malloc
__libc_start_main
printf
memcpy
libc.so.6
GLIBC_2.14
GLIBC_2.34
GLIBC_2.2.5
__gmon_start__
PTE1
H=H@@
data
got: %s
9*3$"
GCC: (Ubuntu 13.3.0-6ubuntu2~24.04.1) 13.3.0
size_t
vuln_strcpy
GNU C17 13.3.0 -mtune=generic -march=x86-64 -g -O0 -fno-stack-protector -fasynchronous-unwind-tables -fstack-clash-protection -fcf-protection
unsigned char
short unsigned int
main
long long unsigned int
vuln_uaf
atoi
argc
