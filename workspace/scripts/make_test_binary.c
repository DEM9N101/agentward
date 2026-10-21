#include <stdio.h>
#include <string.h>
#include <stdlib.h>

void vuln_strcpy(char *in) {
    char buf[32];
    strcpy(buf, in);          // classic stack overflow
    printf("got: %s\n", buf);
}

void vuln_memcpy(char *in, int n) {
    char buf[16];
    memcpy(buf, in, n);       // unchecked length
}

char *vuln_uaf(void) {
    char *p = malloc(64);
    strcpy(p, "data");
    free(p);
    return p;                 // dangling pointer
}

int main(int argc, char **argv) {
    if (argc < 2) return 1;
    vuln_strcpy(argv[1]);
    vuln_memcpy(argv[1], atoi(argv[1]));
    char *d = vuln_uaf();
    puts(d);
    return 0;
}
