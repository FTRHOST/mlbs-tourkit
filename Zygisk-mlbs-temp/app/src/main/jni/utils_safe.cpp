#include "utils_safe.h"
#include <unistd.h>
#include <sys/uio.h>
#include <sys/syscall.h>
#include <errno.h>

#if defined(__arm__)
#define process_vm_readv_syscall 376
#elif defined(__aarch64__)
#define process_vm_readv_syscall 270
#elif defined(__i386__)
#define process_vm_readv_syscall 347
#else
#define process_vm_readv_syscall 310
#endif

bool read_memory_safe(void* address, void* buffer, size_t size) {
    struct iovec local[1];
    struct iovec remote[1];

    local[0].iov_base = buffer;
    local[0].iov_len = size;
    remote[0].iov_base = address;
    remote[0].iov_len = size;

    long result = syscall(process_vm_readv_syscall, getpid(), local, 1, remote, 1, 0);
    return result == (long)size;
}
